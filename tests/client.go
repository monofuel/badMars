package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
	"regexp"

	"github.com/pkg/errors"
)

type BMClient struct {
	Hostname     string
	SessionToken string

	http *http.Client
}

type User struct {
	UUID     string `json:"uuid"`
	Username string `json:"username"`
}

func NewClient(hostname string) *BMClient {
	return &BMClient{
		Hostname: hostname,
		http:     &http.Client{},
	}
}

func (c *BMClient) Register(username string, email string, password string) (*User, error) {
	type registerRequest struct {
		Username string `json:"username"`
		Email    string `json:"email"`
		Password string `json:"password"`
	}

	body, err := json.Marshal(&registerRequest{
		Username: username,
		Email:    email,
		Password: password,
	})
	if err != nil {
		return nil, errors.Wrap(err, "failed to marshal registration request")
	}
	url := fmt.Sprintf("http://%s/auth/register", c.Hostname)
	resp, err := c.http.Post(url, "application/json", bytes.NewBuffer(body))
	if err != nil {
		return nil, errors.Wrap(err, "failed to post registration")
	}

	if resp.StatusCode != 200 {
		return nil, errors.New(fmt.Sprintf("bad registration response %v\n", resp))
	}

	fmt.Println("response")
	buff, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return nil, errors.Wrap(err, "failed to parse response")
	}
	fmt.Println(string(buff))

	// match token in response
	// ^\s*const\s*token\s*=\s*\"(.*)\"\s*;$

	re := regexp.MustCompile(`(?m:^\s*const\s*token\s*=\s*\'(.*)\'\s*;$)`)
	res := re.FindAllStringSubmatch(string(buff), -1)
	fmt.Printf("found %v", res)
	if len(res) != 1 || len(res[0]) != 2 {
		return nil, fmt.Errorf("failed to find session token in response")
	}
	token := res[0][1]
	fmt.Printf("Session token: %s\n", token)

	selfUrl := fmt.Sprintf("http://%s/auth/self", c.Hostname)
	selfReq, err := http.NewRequest("GET", selfUrl, nil)
	if err != nil {
		return nil, errors.Wrap(err, "failed to prepare self request")
	}
	selfReq.Header.Set("session-token", token)

	selfResp, err := c.http.Do(selfReq)
	if err != nil {
		return nil, errors.Wrap(err, "self response failed")
	}

	self := new(User)
	selfBody, err := ioutil.ReadAll(selfResp.Body)
	if err != nil {
		return nil, errors.Wrap(err, "failed to buffer response")
	}
	err = json.Unmarshal(selfBody, self)
	if err != nil {
		return nil, errors.Wrap(err, "failed to unmarshal response")
	}

	return nil, nil
}
